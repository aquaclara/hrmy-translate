import * as Translation from '../translation';
import * as Comment from '../comment';

type TranslationChuckDataModel = Array<
  Translation.DataModel | Comment.DataModel
>;
export default TranslationChuckDataModel;
