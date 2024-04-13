import React, { memo } from 'react';
import { Button } from '@nextui-org/react';

import { ToastUtils } from 'utils';

const printData = async () => {
  window.electron.ipcRenderer
    .invoke('print', []) // Fix: Change 'print' to 'ipc-example'
    .then(() =>
      ToastUtils.displayToast('success', 'Successfully printed the data'),
    )
    .catch((e) =>
      ToastUtils.displayToast('warning', `Unable to print the data ${e}`),
    );
};

const PrintButton = () => {
  return <Button onClick={printData}>Print</Button>;
};

export default memo(PrintButton);
