import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from './ui/button';

function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registrado:', r);
    },
    onRegisterError(error) {
      console.error('Erro no registro do Service Worker:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('Aplicativo pronto para funcionar offline!');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      const toastId = toast.info('Nova versão disponível!', {
        action: (
          <Button
            size="sm"
            onClick={() => {
              updateServiceWorker(true);
              toast.dismiss(toastId);
            }}
          >
            Atualizar
          </Button>
        ),
        duration: Infinity, // Mantém o toast visível até ser dispensado
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export default PwaUpdater;