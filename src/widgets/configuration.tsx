import React from 'react';

interface PropsType {
  version: string;
  onClickOverlay: (event: React.MouseEvent<HTMLDivElement>) => void;
  defaultFontSize: number;
  onChangeFontSize: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultApplyFont: boolean;
  onChangeApplyFont: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultDevelopmentMode: boolean;
  onChangeDevelopmentMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
          <input
            type="checkbox"
            id="apply-font"
            defaultChecked={this.props.defaultApplyFont}
            onChange={this.props.onChangeApplyFont}
          />
          <label htmlFor="apply-font">폰트 사용</label>
          <input
            type="checkbox"
            id="development-mode"
            defaultChecked={this.props.defaultDevelopmentMode}
            onChange={this.props.onChangeDevelopmentMode}
          />
          <label htmlFor="development-mode">개발자 모드</label>
          <button
            id="remove-storage"
            onClick={() => chrome.storage.local.remove(location.pathname)}
          >
            수정 캐시 비우기
          </button>

          <p>버전: v{this.props.version}</p>
        </div>
      </div>
    );
  }
}
