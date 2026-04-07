import { getTeacherSession } from './auth';
import { HOME_IMAGE_EDIT_MODE_KEY } from './homeImageSlots';

export const isPrincipalImageEditModeEnabled = () => {
  const isPrincipal = getTeacherSession()?.position === 'Principal';
  const toggleEnabled = localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true';
  return isPrincipal && toggleEnabled;
};
