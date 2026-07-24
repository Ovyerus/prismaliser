import type {} from '@atcute/lexicons';
import * as v from '@atcute/lexicons/validations';
import type {} from '@atcute/lexicons/ambient';

const _mainSchema = /*#__PURE__*/ v.record(
	/*#__PURE__*/ v.tidString(),
	/*#__PURE__*/ v.object(
		{
			"$type": /*#__PURE__*/ v.literal("app.prismaliser.schema"),
			"createdAt": /*#__PURE__*/ v.datetimeString(),
			/**
			 * @maxLength 160
			 * @maxGraphemes 80
			 */
			"name": /*#__PURE__*/ v.optional(/*#__PURE__*/ v.constrain(
				/*#__PURE__*/ v.string(),
				[
					/*#__PURE__*/ v.stringLength(0, 160),
					/*#__PURE__*/ v.stringGraphemes(0, 80)
				]
			)),
			/**
			 * @maxLength 5000
			 */
			get "positions"() {
				return /*#__PURE__*/ v.constrain(
					/*#__PURE__*/ v.array(positionSchema),
					[/*#__PURE__*/ v.arrayLength(0, 5000)]
				)
			},
			/**
			 * @maxLength 64
			 */
			"prismaVersion": /*#__PURE__*/ v.constrain(
				/*#__PURE__*/ v.string(),
				[/*#__PURE__*/ v.stringLength(0, 64)]
			),
			/**
			 * @accept text/plain
			 * @maxSize 500000
			 */
			"schema": /*#__PURE__*/ v.constrain(
				/*#__PURE__*/ v.blob(),
				[
					/*#__PURE__*/ v.blobSize(500000),
					/*#__PURE__*/ v.blobAccept(["text/plain"])
				]
			),
		}
	)
);
const _positionSchema = /*#__PURE__*/ v.object(
	{
		"$type": /*#__PURE__*/ v.optional(/*#__PURE__*/ v.literal("app.prismaliser.schema#position")),
		/**
		 * @maxLength 512
		 */
		"id": /*#__PURE__*/ v.constrain(
			/*#__PURE__*/ v.string(),
			[/*#__PURE__*/ v.stringLength(0, 512)]
		),
		/**
		 * @minimum -10000000
		 * @maximum 10000000
		 */
		"x": /*#__PURE__*/ v.constrain(
			/*#__PURE__*/ v.integer(),
			[/*#__PURE__*/ v.integerRange(-10000000, 10000000)]
		),
		/**
		 * @minimum -10000000
		 * @maximum 10000000
		 */
		"y": /*#__PURE__*/ v.constrain(
			/*#__PURE__*/ v.integer(),
			[/*#__PURE__*/ v.integerRange(-10000000, 10000000)]
		),
	}
);
type main$schematype = typeof _mainSchema;
type position$schematype = typeof _positionSchema;

export interface mainSchema extends main$schematype {}

export interface positionSchema extends position$schematype {}
export const mainSchema = _mainSchema as mainSchema;
export const positionSchema = _positionSchema as positionSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}

export interface Position extends v.InferInput<typeof positionSchema> {}
declare module '@atcute/lexicons/ambient' {
	interface Records {
		"app.prismaliser.schema": mainSchema;
	}
}
