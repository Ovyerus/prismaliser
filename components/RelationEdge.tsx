import React, { memo } from "react";
import {
  EdgeProps,
  EdgeText,
  getEdgeCenter,
  getSmoothStepPath,
} from "react-flow-renderer";
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
  const [centerX, centerY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const path = getSmoothStepPath({
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

  const { relationType } = data;
  const [markerStart, markerEnd] = {
    "m-n": ["url(#prismaliser-many)", "url(#prismaliser-many)"],
    "1-n": ["url(#prismaliser-many)", "url(#prismaliser-one)"],
    "1-1": ["url(#prismaliser-one)", "url(#prismaliser-one)"],
  }[relationType];

  // TODO: markers look weird when the edge needs to rotate perpendicular to the
  // start or end. Maybe need to edit `getSmoothStepPath` so it adds some sort
  // of padding at start and end to make it look nicer?
  return (
    <>
      <path
        className="stroke-2 stroke-current fill-none text-gray-400"
        d={path}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {text}
    </>
  );
};

export default memo(RelationEdge);
