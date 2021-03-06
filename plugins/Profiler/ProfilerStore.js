/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict';

import type Bridge from '../../agent/Bridge';
import type {ChartType, Interaction, RootProfilerData, Snapshot} from './ProfilerTypes';

const {List} = require('immutable');
const {EventEmitter} = require('events');
const {get, set} = require('../../utils/storage');

const LOCAL_STORAGE_CHART_TYPE_KEY = 'profiler:selectedChartType';
const LOCAL_STORAGE_SHOW_NATIVE_NODES_KEY = 'profiler:showNativeNodes';

class ProfilerStore extends EventEmitter {
  _bridge: Bridge;
  _mainStore: Object;

  cachedData = {};
  isRecording: boolean = false;
  processedInteractions: {[id: string]: Interaction} = {};
  rootsToProfilerData: Map<string, RootProfilerData> = new Map();
  roots: List = new List();
  selectedChartType: ChartType = ((get(LOCAL_STORAGE_CHART_TYPE_KEY, 'flamegraph'): any): ChartType);
  selectedRoot: string | null = null;
  showNativeNodes: boolean = ((get(LOCAL_STORAGE_SHOW_NATIVE_NODES_KEY, false): any): boolean);

  constructor(bridge: Bridge, mainStore: Object) {
    super();

    this._bridge = bridge;
    this._mainStore = mainStore;
    this._mainStore.on('clearSnapshots', this.clearSnapshots);
    this._mainStore.on('roots', this.saveRoots);
    this._mainStore.on('selected', this.updateSelected);
    this._mainStore.on('storeSnapshot', this.storeSnapshot);
  }

  off() {
    // Noop
  }

  cacheDataForSnapshot(snapshotIndex: number, snapshotRootID: string, key: string, data: any): void {
    this.cachedData[`${snapshotIndex}-${snapshotRootID}-${key}`] = data;
  }

  cacheInteractionData(rootID: string, data: any): void {
    this.cachedData[`${rootID}-interactions`] = data;
  }

  clearSnapshots = () => {
    this.cachedData = {};
    this.processedInteractions = {};
    this.rootsToProfilerData = new Map();
    this.emit('profilerData', this.rootsToProfilerData);
  };

  getCachedDataForSnapshot(snapshotIndex: number, snapshotRootID: string, key: string): any {
    return this.cachedData[`${snapshotIndex}-${snapshotRootID}-${key}`] || null;
  }

  getCachedInteractionData(rootID: string): any {
    return this.cachedData[`${rootID}-interactions`] || null;
  }

  processInteraction(interaction: Interaction): Interaction {
    const key = `${interaction.name} at ${interaction.timestamp}`;
    if (this.processedInteractions.hasOwnProperty(key)) {
      return this.processedInteractions[key];
    } else {
      this.processedInteractions[key] = interaction;
      return interaction;
    }
  }

  saveRoots = () => {
    this.roots = this._mainStore.roots;
    this.emit('roots', this._mainStore.roots);
  };

  setSelectedChartType(selectedChartType: ChartType) {
    this.selectedChartType = selectedChartType;
    this.emit('selectedChartType', selectedChartType);
    set(LOCAL_STORAGE_CHART_TYPE_KEY, selectedChartType);
  }

  setShowNativeNodes(showNativeNodes: boolean) {
    this.showNativeNodes = showNativeNodes;
    this.emit('showNativeNodes', showNativeNodes);
    set(LOCAL_STORAGE_SHOW_NATIVE_NODES_KEY, showNativeNodes);
  }

  setIsRecording(isRecording: boolean): void {
    this.isRecording = isRecording;
    this.emit('isRecording', isRecording);
    this._mainStore.setIsRecording(isRecording);
  }

  storeSnapshot = () => {
    this._mainStore.snapshotQueue.forEach((snapshot: Snapshot) => {
      const { root } = snapshot;
      if (!this.rootsToProfilerData.has(root)) {
        this.rootsToProfilerData.set(root, {
          interactionsToSnapshots: new Map(),
          snapshots: [],
          timestampsToInteractions: new Map(),
        });
      }

      const {interactionsToSnapshots, snapshots, timestampsToInteractions} =
        ((this.rootsToProfilerData.get(root): any): RootProfilerData);

      snapshots.push(snapshot);

      // Restore Interaction instance equality between commits,
      // Since this will be lost due to Bridge serialization.
      snapshot.memoizedInteractions = snapshot.memoizedInteractions.map(
        (interaction: Interaction) => this.processInteraction(interaction)
      );

      snapshot.memoizedInteractions.forEach((interaction: Interaction) => {
        if (interactionsToSnapshots.has(interaction)) {
          ((interactionsToSnapshots.get(interaction): any): Set<Snapshot>).add(snapshot);
        } else {
          interactionsToSnapshots.set(interaction, new Set([snapshot]));
        }

        if (timestampsToInteractions.has(interaction.timestamp)) {
          ((timestampsToInteractions.get(interaction.timestamp): any): Set<Interaction>).add(interaction);
        } else {
          timestampsToInteractions.set(interaction.timestamp, new Set([interaction]));
        }
      });
    });

    // Clear the queue once we've processed it.
    this._mainStore.snapshotQueue.length = 0;

    this.emit('profilerData', this.rootsToProfilerData);
  };

  updateSelected = () => {
    let currentID = this._mainStore.selected;

    while (true) {
      const parentID = this._mainStore.getParent(currentID);
      if (parentID != null) {
        currentID = parentID;
      } else {
        break;
      }
    }

    this.selectedRoot = currentID;
    this.emit('selectedRoot', this.selectedRoot);
  };
}

module.exports = ProfilerStore;
