import FileTranslationChuckDataModel from '../data-models/translation-chucks/file';

export default interface TranslationDataContainer {
  getData(): FileTranslationChuckDataModel;
  setData(value: FileTranslationChuckDataModel): void;
  getDataInYaml(): string;
}
