import { toast } from 'react-hot-toast';

export const displayToast = (
  responseStatus: 'success' | 'warning',
  message: string,
) => {
  if (responseStatus === 'success') {
    toast.success(message, {
      style: {
        padding: '16px',
        color: '#fff',
        backgroundColor: '#223028',
      },
      iconTheme: {
        primary: '#6fcf97',
        secondary: '#fff',
      },
    });
  } else if (responseStatus === 'warning') {
    toast.error(message, {
      style: {
        padding: '16px',
        color: '#FF0000',
      },
      iconTheme: {
        primary: '#FF0000',
        secondary: '#fff',
      },
    });
  }
};
