export interface IWorkpackProperty {
  id?: number;
  type: string;
  name?: string;
  session?: string;
  idPropertyModel: number;
  value?: string | number | boolean | string[] | number[] | Date;
  selectedValues?: number[];
  selectedValuesDetails?: {id: number; name: string; fullName: string}[];
  selectedValue?: number;
  reason?: string;
  /** Selecao dinamica: rotulo(s) do(s) codigo(s) em value, gravado(s) junto. */
  label?: string;
  groupedProperties?: IWorkpackProperty[];
}
