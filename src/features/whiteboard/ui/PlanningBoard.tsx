import React from 'react';
import { WhiteboardCanvas } from 'widgets/whiteboard-canvas';

export const PlanningBoard: React.FC = () => {
  return (
    <div className="fixed inset-0 w-full h-full bg-white">
      <WhiteboardCanvas className="w-full h-full" />
    </div>
  );
};

PlanningBoard.displayName = 'PlanningBoard';
