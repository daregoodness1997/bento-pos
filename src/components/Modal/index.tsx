import React, { FC, memo } from 'react';
import {
  Modal as NextModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@nextui-org/react';

interface Props {
  isOpen: boolean;
  onOpenChange: () => void;
  children?: React.ReactNode;
  title?: string;
  onSubmit?: () => void;
}

const Modal: FC<Props> = ({
  isOpen,
  onOpenChange,
  title,
  onSubmit,
  children,
}) => {
  return (
    <NextModal
      backdrop="opaque"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      radius="lg"
      classNames={{
        body: 'py-6 pt-12',
        backdrop: 'bg-[#18181b]/50 backdrop-opacity-40',
        base: 'border-[#18181b] bg-[#18181b] dark:bg-[#19172c] text-[#a8b0d3]',
        header: 'border-b-[1px] border-[#18181b]',
        footer: ' border-[#18181b]',
        closeButton: 'hover:bg-white/5 active:bg-white/10',
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {title && (
              <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
            )}

            <ModalBody>{children}</ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="bordered"
                radius="full"
                onPress={onClose}
              >
                Close
              </Button>
              <Button color="primary" radius="full" onPress={onSubmit}>
                Complete
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </NextModal>
  );
};

Modal.defaultProps = {
  children: null,
  title: '',
  onSubmit: () => null,
};

export default memo(Modal);
