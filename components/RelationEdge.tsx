import React, { memo } from "react";
import {
  EdgeProps,
  EdgeText,
  getSmoothStepPath,
} from "reactflow";

import { RelationEdgeData } from "~/util/types";

const RelationEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  labelStyle,
  labelShowBg,
  labelBgBorderRadius,
  labelBgPadding,
  labelBgStyle,
  data,
}: EdgeProps<RelationEdgeData>) => {
  const [path, centerX, centerY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  const text = label ? (
    <EdgeText
      x={centerX}
      y={centerY}
      label={label}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  ) : null;

  const { relationType } = data!;
  const [markerStart, markerEnd] = {
    "m-n": ["url(#prismaliser-many)", "url(#prismaliser-many)"],
    "1-n": ["url(#prismaliser-many)", "url(#prismaliser-one)"],
    "1-1": ["url(#prismaliser-one)", "url(#prismaliser-one)"],
  }[relationType];

  return (
    <>
      <path
        className="text-gray-400 stroke-current stroke-2 fill-none dark:text-gray-600"
        d={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {text}
    </>
  );
};

export default memo(RelationEdge);
