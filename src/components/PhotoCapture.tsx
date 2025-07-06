import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RefreshCw, Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

interface Geolocation {
  latitude: number;
  longitude: number;
}

interface PhotoCaptureProps {
  onPhotoTaken: (dataUrl: string, location: Geolocation | null) => void;
  onCancel: () => void;
}

const PhotoCapture = ({ onPhotoTaken, onCancel }: PhotoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState<Geolocation | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCapturedImage(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      streamRef.current = mediaStream;
      setCameraError(null);
      setIsCameraReady(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      const errorMessage = "Não foi possível acessar a câmera. Verifique as permissões no seu navegador.";
      setCameraError(errorMessage);
      showError(errorMessage);
      setIsCameraReady(false);
    }
  }, [stopCamera]);

  const getLocation = useCallback(() => {
    setIsFetchingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsFetchingLocation(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        const errorMessage = "Não foi possível obter a localização. Verifique as permissões.";
        setLocationError(errorMessage);
        showError(errorMessage);
        setIsFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    startCamera();
    getLocation();
    return () => {
      stopCamera();
    };
  }, [startCamera, getLocation, stopCamera]);

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
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
      onPhotoTaken(capturedImage, location);
    }
  };

  const isButtonDisabled = !isCameraReady || !!cameraError || isFetchingLocation || !!locationError;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        {cameraError ? (
          <div className="p-4 text-center text-destructive">{cameraError}</div>
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
      {locationError && <p className="text-sm text-destructive text-center">{locationError}</p>}
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
            <Button onClick={handleTakePhoto} disabled={isButtonDisabled}>
              {isFetchingLocation ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {isFetchingLocation ? 'Obtendo GPS...' : 'Tirar Foto'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoCapture;