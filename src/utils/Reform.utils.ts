export const reformData = async (MENU: any) => {
  const data = await Promise.all(
    MENU.map(async (item: { id: string; imageUrl: string }) => {
      try {
        const localPath = await window.electron.ipcRenderer.invoke('download', {
          url: item.imageUrl,
          id: item.id,
        });

        return { ...item, imageUrl: localPath };
      } catch (error) {
        console.error(
          `Failed to download image for item with ID: ${item.id}`,
          error,
        );
        return item;
      }
    }),
  );

  return data;
};
