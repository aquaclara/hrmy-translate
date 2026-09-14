import Cut from './cut';

export type PropertiedDataModel = {
  top?: number;
  text: Cut[];
};
export type DataModel = Cut[] | PropertiedDataModel;
