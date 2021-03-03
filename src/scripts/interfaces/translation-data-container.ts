import FileTranslationChuckData from '../translation-chunk-data';

export default interface TranslationDataContainer {
  getData(): FileTranslationChuckData;
  setData(value: FileTranslationChuckData): void;
  getDataInYaml(): string;
}
