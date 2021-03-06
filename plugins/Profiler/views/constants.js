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

// http://gka.github.io/palettes/#colors=#37AFA9,#FEBC38|steps=10|bez=0|coL=0
export const gradient = [
  '#37afa9', '#63b19e', '#80b393', '#97b488', '#abb67d', '#beb771', '#cfb965', '#dfba57', '#efbb49', '#febc38',
];

export const didNotRender = '#ddd';

export const barHeight = 20;
export const barWidth = 100;
export const barWidthThreshold = 2;
export const minBarHeight = 5;
export const minBarWidth = 5;
export const textHeight = 18;

export const scale = (minValue: number, maxValue: number, minRange: number, maxRange: number) =>
  (value: number) =>
    ((value - minValue) / (maxValue - minValue)) * (maxRange - minRange);

const gradientMaxIndex = gradient.length - 1;
export const getGradientColor = (value: number) => {
  value = Math.max(0, Math.min(gradientMaxIndex, value)); // Guard against invalid indices
  return gradient[Math.round(value * gradientMaxIndex)];
};

export const formatDuration = (duration: number) => Math.round(duration * 10) / 10;
export const formatPercentage = (percentage: number) => Math.round(percentage * 100);
export const formatTime = (timestamp: number) => Math.round(Math.round(timestamp) / 100) / 10;
