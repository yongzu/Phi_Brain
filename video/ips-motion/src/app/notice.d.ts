// 앱의 과제 공지 모듈(design/prototypes/assignment-notice.js, UMD) 타입
declare module '*assignment-notice.js' {
  const notice: {
    renderNotice(raw: string): string;
    dueLabel(at: string | null): string;
    dueLabelWithDow(at: string | null): string;
  };
  export default notice;
}
