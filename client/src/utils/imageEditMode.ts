import { HOME_IMAGE_EDIT_MODE_KEY } from './homeImageSlots';

export const isPrincipalImageEditModeEnabled = () => {
  return localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true';
};
