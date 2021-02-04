import React from 'react';
import { githubUrlBase } from '../constants';

interface PropsType {
  onClickConfigure: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  tlsPath: string;
  editableMode?: boolean;
  onClickCopy: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onClickSave: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export class HotLinks extends React.Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);
  }

  render() {
    return (
      <div className="hot-links">
        {this.props.editableMode && (
          <a className="copy" onClick={this.props.onClickCopy}>
            YAML 복사
          </a>
        )}
        {this.props.editableMode && (
          <a className="save" onClick={this.props.onClickSave}>
            YAML 저장
          </a>
        )}
        <a
          className="translate"
          href={githubUrlBase + this.props.tlsPath}
          target="_blank"
        >
          번역 수정하기
        </a>
        <a className="configure" onClick={this.props.onClickConfigure}>
          &nbsp;
        </a>
        <div className="caution">
          이 사이트와 사이트 내 그림의 무단전제, 도용, 링크, 캡처, 촬영 등은
          금지되어 있으며 자세한 것은 사이트 내 안내를 따라 주세요. 이 한글
          번역은 공식이 아닙니다.
          <button
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
