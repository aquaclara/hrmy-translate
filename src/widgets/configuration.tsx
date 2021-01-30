import React from 'react';

interface PropsType {
  version: string;
  defaultFontSize: number;
  onChangeFontSize: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultDevelopmentMode: boolean;
  onChangeDevelopmentMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClickOverlay: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export class Configuration extends React.Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);
  }

  render() {
    return (
      <div className="overlay" onClick={this.props.onClickOverlay}>
        <div className="dialog">
          <p>
            이 프로그램은 비공식입니다.
            <br />
            This program is unofficial.
          </p>
          <label>글자 크기 (단위: mm)</label>
          <input
            type="range"
            id="font-size"
            min="1"
            max="11"
            defaultValue={this.props.defaultFontSize}
            onChange={this.props.onChangeFontSize}
          />
          <label>
            <input
              type="checkbox"
              id="development-mode"
              defaultChecked={this.props.defaultDevelopmentMode}
              onChange={this.props.onChangeDevelopmentMode}
            />
            개발자 모드
          </label>

          <p>버전: v{this.props.version}</p>
        </div>
      </div>
    );
  }
}
