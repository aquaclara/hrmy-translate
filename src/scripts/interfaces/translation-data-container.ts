import FileTranslationChuckData from '../translation-chuck-data';

export default interface TranslationDataContainer {
  getData(): FileTranslationChuckData;
  setData(value: FileTranslationChuckData): void;
  getDataInYaml(): string;
}
