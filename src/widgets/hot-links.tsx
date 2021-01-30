import React from 'react';

interface PropsType {
  onClickConfigure: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  tlsPath: string;
  onClickSave: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  writeMode?: boolean;
}

export class HotLinks extends React.Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);
  }

  render() {
    return (
      <div className="hot-links">
        {this.props.writeMode && (
          <a className="save" onClick={this.props.onClickSave}>
            YAML 저장
          </a>
        )}
        <a className="configure" onClick={this.props.onClickConfigure}>
          &nbsp;
        </a>
        <a
          className="translate"
          href={`https://github.com/aquaclara/hrmy-translate/blob/main/${this.props.tlsPath}`}
          target="_blank"
        >
          번역 수정하기
        </a>
      </div>
    );
  }
}
