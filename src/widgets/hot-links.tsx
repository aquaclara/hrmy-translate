import React from 'react';
import { githubUrlBase } from '../constants';

interface PropsType {
  onClickConfigure: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  tlsPath: string;
  onClickCopy: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  defaultEditableMode: boolean;
  onChangeEditableMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string;
  fullFilePath: string;
}

export class HotLinks extends React.Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);
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
          href={githubUrlBase + this.props.tlsPath}
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
        <a className="copy clickable cell" onClick={this.props.onClickCopy}>
          YAML 복사
        </a>
        <div id="file-name" className="cell">
          <span>{this.props.fileName}</span>
          <span className="full-file-path">{this.props.fullFilePath}</span>
        </div>
        <div className="caution cell">
          이 사이트 내 그림의 무단전제, 도용, 링크, 캡처, 촬영 등은 금지되어
          있으며 자세한 것은 사이트 내 안내를 따라 주세요. 이 한글 번역은 공식이
          아닙니다.
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
