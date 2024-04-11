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
}

const Modal: FC<Props> = ({ isOpen, onOpenChange, children }) => {
  return (
    <NextModal
      backdrop="opaque"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      radius="lg"
      classNames={{
        body: 'py-6',
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
            <ModalHeader className="flex flex-col gap-1">
              Modal Title
            </ModalHeader>
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
              <Button color="primary" radius="full" onPress={onClose}>
                Action
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
};

export default memo(Modal);
