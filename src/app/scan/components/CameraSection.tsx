"use client";
import { CameraView } from "../CameraView";

interface CameraSectionProps {
  cameraRef: any;
  status: string;
  isCapturing: boolean;
  isOpenCVReady: boolean;
  cameraPermission: "checking" | "granted" | "denied";
  onAutoCapture?: (backendData: any) => void;
  onRetryPermission: () => void;
}

export const CameraSection = ({
  cameraRef,
  status,
  isCapturing,
  isOpenCVReady,
  cameraPermission,
  onAutoCapture,
  onRetryPermission,
}: CameraSectionProps) => {
  return (
    <div className="bg-white rounded-[28px] shadow-lg p-2 max-w-[560px] mx-auto">
      <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-sm bg-black relative">
        <CameraView
          ref={cameraRef}
          status={status}
          isCapturing={isCapturing}
          isCVReady={isOpenCVReady}
          onAutoCapture={onAutoCapture}
        />
      </div>
    </div>
  );
};