import { LoadDictElement } from 'di-why/build/src/DiContainer';
import { CustomizableLoaderHandles, customizableLoaderHandles } from '../utils/loadDictGenerator/customizableLoaderHandles';

const loadDictElement: LoadDictElement<CustomizableLoaderHandles> = {
  instance: customizableLoaderHandles
};

export default loadDictElement;
