import React from 'react';
import { githubRawUrlBase } from '../constants';

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
          href={githubRawUrlBase + this.props.tlsPath}
          target="_blank"
        >
          번역 수정하기
        </a>
        <a className="configure" onClick={this.props.onClickConfigure}>
          &nbsp;
        </a>
      </div>
    );
  }
}
