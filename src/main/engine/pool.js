'use strict';

/**
 * NRD · pool.js — 3-Slot Browser Concurrency Pool (Pillar 2 & Pillar 6)
 * 
 * Manages 3 independent browser slots (configurable up to 5):
 * - True parallel concurrency across slots with overlapping execution
 * - Dedicated slot state machine: 'idle' | 'active' | 'paused_captcha' | 'error'
 * - Queue manager assigns tasks to the first available slot
 * - CAPTCHA isolation: paused slot only pauses itself; other slots proceed normally
 * - Broadcasts slot status changes to renderer / live logs
 */

const EventEmitter = require('node:events');

class BrowserSlot {
  constructor(id) {
    this.id = id;
    this.name = `Slot #${id}`;
    this.status = 'idle'; // 'idle' | 'active' | 'paused_captcha' | 'error'
    this.currentTask = null;
    this.startTime = null;
    this.totalCompleted = 0;
    this.lastError = null;
    this.context = null;
    this.activePage = null;
    this.countryTabs = new Map(); // countryCode -> page (Pillar 6: multi-country tabs)
  }

  setBusy(task) {
    this.status = 'active';
    this.currentTask = task;
    this.startTime = Date.now();
  }

  setIdle() {
    this.status = 'idle';
    this.currentTask = null;
    this.startTime = null;
    this.totalCompleted += 1;
  }

  setPausedCaptcha() {
    this.status = 'paused_captcha';
  }

  setResumed() {
    if (this.currentTask) {
      this.status = 'active';
    } else {
      this.status = 'idle';
    }
  }

  setError(err) {
    this.status = 'error';
    this.lastError = err ? err.message : 'Unknown error';
  }

  getSnapshot() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      currentTask: this.currentTask ? {
        id: this.currentTask.id,
        description: this.currentTask.description,
        query: this.currentTask.query,
        countryCode: this.currentTask.countryCode,
        runId: this.currentTask.runId,
        agentNumber: this.currentTask.agentNumber,
      } : null,
      elapsedMs: this.startTime ? Date.now() - this.startTime : 0,
      totalCompleted: this.totalCompleted,
      lastError: this.lastError,
    };
  }
}

class BrowserSlotPool extends EventEmitter {
  constructor(slotCount = 3) {
    super();
    this.slotCount = Math.max(1, Math.min(5, Number(slotCount) || 3));
    this.slots = [];
    for (let i = 1; i <= this.slotCount; i++) {
      this.slots.push(new BrowserSlot(i));
    }
    this.queue = [];
    this.isProcessingQueue = false;
  }

  resize(newCount) {
    const target = Math.max(1, Math.min(5, Number(newCount) || 3));
    if (target === this.slots.length) return;

    if (target > this.slots.length) {
      for (let i = this.slots.length + 1; i <= target; i++) {
        this.slots.push(new BrowserSlot(i));
      }
    } else {
      // Remove excess idle slots from the end
      while (this.slots.length > target) {
        const last = this.slots[this.slots.length - 1];
        if (last.status === 'idle') {
          this.slots.pop();
        } else {
          break; // Don't remove active slots
        }
      }
    }

    this.emitState();
  }

  getAvailableSlot() {
    return this.slots.find((s) => s.status === 'idle');
  }

  getSlot(id) {
    return this.slots.find((s) => s.id === id) || null;
  }

  /**
   * Submits a browser task to be executed by a free slot in true parallel.
   * @param {object} taskInfo
   * @param {string} taskInfo.description
   * @param {string} [taskInfo.query]
   * @param {string} [taskInfo.countryCode]
   * @param {number} [taskInfo.runId]
   * @param {number} [taskInfo.agentNumber]
   * @param {(slot: BrowserSlot) => Promise<any>} executeFn
   * @returns {Promise<any>}
   */
  enqueue(taskInfo, executeFn) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...taskInfo,
      executeFn,
      enqueuedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.dispatchNext();
    });
  }

  dispatchNext() {
    if (this.queue.length === 0) return;

    const slot = this.getAvailableSlot();
    if (!slot) return; // All slots busy or paused

    const { task, resolve, reject } = this.queue.shift();
    slot.setBusy(task);
    this.emitState();

    this.emit('slot:started', {
      slotId: slot.id,
      task: slot.getSnapshot().currentTask,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();

    // Execute with error boundary
    Promise.resolve()
      .then(() => task.executeFn(slot))
      .then((result) => {
        const durationMs = Date.now() - startTime;
        slot.setIdle();
        this.emitState();
        this.emit('slot:completed', {
          slotId: slot.id,
          taskId: task.id,
          durationMs,
          timestamp: new Date().toISOString(),
        });
        resolve(result);
      })
      .catch((err) => {
        const durationMs = Date.now() - startTime;
        slot.setError(err);
        this.emitState();
        this.emit('slot:error', {
          slotId: slot.id,
          taskId: task.id,
          error: err.message,
          durationMs,
        });
        // Release slot after error
        setTimeout(() => {
          if (slot.status === 'error') {
            slot.setIdle();
            this.emitState();
            this.dispatchNext();
          }
        }, 500);
        reject(err);
      })
      .finally(() => {
        this.dispatchNext();
      });
  }

  /**
   * Pauses a specific slot due to CAPTCHA detection.
   * Other slots continue running!
   * @param {number} slotId
   */
  pauseForCaptcha(slotId) {
    const slot = this.getSlot(slotId);
    if (slot) {
      slot.setPausedCaptcha();
      this.emitState();
      this.emit('slot:paused', { slotId, reason: 'captcha' });
    }
  }

  /**
   * Resumes a paused slot once CAPTCHA has been solved.
   * @param {number} slotId
   */
  resumeFromCaptcha(slotId) {
    const slot = this.getSlot(slotId);
    if (slot && slot.status === 'paused_captcha') {
      slot.setResumed();
      this.emitState();
      this.emit('slot:resumed', { slotId });
      this.dispatchNext();
    }
  }

  emitState() {
    this.emit('slots:updated', this.getSnapshot());
  }

  getSnapshot() {
    return {
      slotCount: this.slots.length,
      queueLength: this.queue.length,
      slots: this.slots.map((s) => s.getSnapshot()),
    };
  }
}

const slotPool = new BrowserSlotPool(3);

module.exports = {
  BrowserSlot,
  BrowserSlotPool,
  slotPool,
};
