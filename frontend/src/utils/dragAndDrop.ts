export const VAULT_DRAG_MIME = 'application/x-dawvix-vault-items';

export const isExternalFileDrag = (dataTransfer: DataTransfer): boolean =>
  Array.from(dataTransfer.types).includes('Files');

export const setDraggedItemIds = (dataTransfer: DataTransfer, itemIds: string[]): void => {
  const payload = JSON.stringify(itemIds);
  dataTransfer.setData(VAULT_DRAG_MIME, payload);
  dataTransfer.setData('application/json', payload);
  dataTransfer.effectAllowed = 'move';
};

export const getDraggedItemIds = (dataTransfer: DataTransfer): string[] => {
  const payload =
    dataTransfer.getData(VAULT_DRAG_MIME) ||
    dataTransfer.getData('application/json');
  if (!payload) return [];

  try {
    const itemIds: unknown = JSON.parse(payload);
    if (Array.isArray(itemIds) && itemIds.every((itemId) => typeof itemId === 'string')) {
      return itemIds;
    }
    console.warn('Ignored an invalid vault drag payload.');
  } catch (error) {
    console.warn('Unable to read dragged vault items.', error);
  }
  return [];
};
