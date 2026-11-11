export interface DensityTokens {
  tableRowHeight: string;
  tableCellPaddingY: string;
  tableCellPaddingX: string;
  inputHeight: string;
  buttonHeight: string;
}

export const comfortableDensity: DensityTokens = {
  tableRowHeight: "44px",
  tableCellPaddingY: "12px",
  tableCellPaddingX: "16px",
  inputHeight: "40px",
  buttonHeight: "40px",
};

export const compactDensity: DensityTokens = {
  tableRowHeight: "32px",
  tableCellPaddingY: "6px",
  tableCellPaddingX: "12px",
  inputHeight: "32px",
  buttonHeight: "32px",
};
