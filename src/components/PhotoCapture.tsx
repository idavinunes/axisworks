import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RefreshCw } from 'lucide-react';
import { showError } from '@/utils/toast';

interface PhotoCaptureProps {
  onPhotoTaken: (dataUrl: string) => void;
  onCancel: () => void;
}

const PhotoCapture = ({ onPhotoTaken, onCancel }: PhotoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCapturedImage(null);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      const errorMessage = "Não foi possível acessar a câmera. Verifique as permissões no seu navegador.";
      setError(errorMessage);
      showError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onPhotoTaken(capturedImage);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        {error ? (
          <div className="p-4 text-center text-destructive">{error}</div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
            />
            {capturedImage && (
              <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {capturedImage ? (
          <>
            <Button onClick={startCamera} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Tirar Outra
            </Button>
            <Button onClick={handleConfirm}>
              Confirmar Foto
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onCancel} variant="outline">
              <X className="mr-2 h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleTakePhoto} disabled={!stream || !!error}>
              <Camera className="mr-2 h-4 w-4" /> Tirar Foto
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoCapture;