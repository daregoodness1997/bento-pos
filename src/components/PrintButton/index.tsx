import React, { memo } from 'react';
import { Button } from '@nextui-org/react';
import { ToastUtils } from 'utils';

const { ipcRenderer } = window.require('electron');

const printData = async () => {
  const data: any = [
    // Your printing data here
  ];

  try {
    await ipcRenderer.invoke('print', data);
    ToastUtils.displayToast('success', 'Succesfully printed the data');
  } catch (error) {
    ToastUtils.displayToast('warning', 'Unable to print the data');
  }
};

const PrintButton = () => {
  return <Button onClick={printData}>Print</Button>;
};

export default memo(PrintButton);
