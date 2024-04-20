// useReformedMenu.ts
import { useState, useCallback } from 'react';
import { ReformUtils, ToastUtils } from '../../utils';
import { Item } from '../types';
import { Toast } from '../enums';

export const useReformedMenu = (MENU: any) => {
  const [reformedMenu, setReformedMenu] = useState<Item[]>([]);

  const fetchReformedMenu = useCallback(async () => {
    try {
      const data = await ReformUtils.reformData(MENU);
      // Only update state if data has changed
      if (JSON.stringify(data) !== JSON.stringify(reformedMenu)) {
        setReformedMenu(data);
        ToastUtils.displayToast(Toast.success, `Successfully fetch data`);
      }

      //   setReformedMenu(data);
      //   ToastUtils.displayToast(Toast.success, `Successfully fetch data`);
    } catch (error) {
      ToastUtils.displayToast(Toast.warning, `Error reforming menu ${error}`);
    }
  }, [MENU, reformedMenu]);

  return { reformedMenu, fetchReformedMenu };
};
