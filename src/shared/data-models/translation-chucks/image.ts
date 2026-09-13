import Cut from './cut';
import Mask from '../mask';

export type PropertiedDataModel = {
  masks: Mask[];
  text: Cut[];
};
export type DataModel = Cut[] | PropertiedDataModel;
