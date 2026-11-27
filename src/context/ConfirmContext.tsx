import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';

interface ConfirmOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  title?: string;
  tone?: 'danger' | 'primary';
}

interface ConfirmRequest extends ConfirmOptions {
  message: string;
}

type ConfirmContextValue = (
  message: string,
  options?: ConfirmOptions,
) => Promise<boolean>;

interface Props {
  children: React.ReactNode;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(
  undefined,
);

export const ConfirmProvider = ({ children }: Props) => {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const pendingRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    const resolve = pendingRef.current;

    pendingRef.current = null;
    setRequest(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) => {
        pendingRef.current?.(false);
        pendingRef.current = resolve;
        setRequest({ message, ...options });
      }),
    [],
  );

  const value = useMemo<ConfirmContextValue>(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        backdrop="blur"
        classNames={{
          base: 'confirm-modal',
          header: 'confirm-modal__header',
          body: 'confirm-modal__body',
          footer: 'confirm-modal__footer',
        }}
        isOpen={request !== null}
        onOpenChange={(open) => {
          if (!open) {
            close(false);
          }
        }}
        placement="center"
      >
        <ModalContent>
          <ModalHeader>{request?.title ?? 'Are you sure?'}</ModalHeader>
          <ModalBody>
            <p className="confirm-modal__message">{request?.message}</p>
          </ModalBody>
          <ModalFooter>
            <button
              className="secondary-button"
              onClick={() => close(false)}
              type="button"
            >
              {request?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              className="primary-button confirm-modal__confirm"
              data-tone={request?.tone ?? 'danger'}
              onClick={() => close(true)}
              type="button"
            >
              {request?.confirmLabel ?? 'Delete'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }

  return context;
};

export default ConfirmProvider;
