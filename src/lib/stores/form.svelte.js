// export type FormManager = {
// 	fields: any[];
// 	values: Record<string, any>;
// 	valid: boolean;
// 	updator(fieldName: string, v: any): void;
// 	activeElement: any;
// };

export default function createFormStore() {
	let formState = $state({
		fields: [],
		values: {},
		isValid: false
	});

	let activeField = $state();

	/**
	 * @param {string | number} fieldName
	 * @param {any} value
	 */
	function updateFieldValue(fieldName, value) {
		// @ts-ignore
		formState.values[fieldName] = value;
	}

	return {
		get fields() {
			return formState.fields;
		},
		set fields(v) {
			formState.fields = v;
		},
		get values() {
			return formState.values;
		},
		/**
		 * @param {string | number} fieldName
		 * @param {any} value
		 */
		updateValue(fieldName, value) {
			updateFieldValue(fieldName, value);
		},
		get isValid() {
			return formState.isValid;
		},
		get activeField() {
			return activeField;
		},
		set activeField(v) {
			activeField = v;
		}
	};
}

export const formStore = createFormStore();
