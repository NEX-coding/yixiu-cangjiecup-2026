/** 竞赛演示版不展示公司备案号 */
export type BeianInfo = {
  icp: string;
  policeRecord: string;
  broadcastLicense: string;
};

export function getBeianInfo(_hostname: string): BeianInfo {
  return {
    icp: "",
    policeRecord: "",
    broadcastLicense: "",
  };
}
