import React from 'react';
const copy = require('copy-to-clipboard');

import TranslationDataContainer from '../interfaces/translation-data-container';
import { GITHUB_URL_BASE } from '../constants';
import { log, init as loggerInit } from '../logger';

interface PropsType {
  onClickConfigure: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  translationDataContainer: TranslationDataContainer;
  defaultEditableMode: boolean;
  onChangeEditableMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export class HotLinks extends React.Component<PropsType, {}> {
  tlsPath: string;
  fileName: string;
  fullFilePath: string;

  constructor(props: PropsType) {
    super(props);
    this.tlsPath =
      '/translations' + location.pathname.replace('.html', '.yaml');
    this.fileName = location.href.substring(location.href.lastIndexOf('/') + 1);
    this.fullFilePath = location.href;
    loggerInit();
  }

  render() {
    return (
      <div className="hot-links">
        <a
          className="configure clickable cell"
          onClick={this.props.onClickConfigure}
        >
          &nbsp;
        </a>
        <a
          className="translate clickable cell"
          href={GITHUB_URL_BASE + this.tlsPath}
          target="_blank"
        >
          번역 수정하기
        </a>
        <label className="editable-mode clickable cell" htmlFor="editable-mode">
          <input
            type="checkbox"
            id="editable-mode"
            defaultChecked={this.props.defaultEditableMode}
            onChange={this.props.onChangeEditableMode}
          />
          <span className="edit-button-label">수정</span>
          <span className="view-button-label">보기</span>
        </label>
        <a
          className="copy clickable cell"
          onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
            log('Copy button clicked');
            copy(this.props.translationDataContainer.getDataInYaml());
          }}
        >
          YAML 복사
        </a>
        <div id="file-name" className="cell">
          <span>{this.fileName}</span>
          <span className="full-file-path">{this.fullFilePath}</span>
        </div>
        <div className="caution cell">
          이 사이트 내 그림의 무단전제, 도용, 링크, 캡처, 촬영 등은 금지되어
          있으며 자세한 것은 사이트 내 안내를 따라 주십시오. 이 한글 번역은
          공식이 아닙니다.
          <button
            className="clickable"
            onClick={() =>
              (document.querySelector('.caution') as HTMLDivElement).remove()
            }
          >
            닫기
          </button>
        </div>
      </div>
    );
  }
}
