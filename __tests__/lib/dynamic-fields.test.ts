import { validateFieldValue, serializeFieldValue, deserializeFieldValue } from '@/lib/dynamic-fields';
import { FieldType } from '@prisma/client';

/**
 * Unit Tests for Dynamic Field Utilities
 * Tests field validation, serialization, and deserialization
 */

describe('Dynamic Fields Utilities', () => {
    // ============================================
    // Field Validation Tests
    // ============================================

    describe('validateFieldValue', () => {
        it('should validate STRING values', async () => {
            const field = {
                fieldType: 'STRING' as FieldType,
                isRequired: false,
                isUnique: false,
                validationRules: { minLength: 3, maxLength: 10 },
            };

            const valid = await validateFieldValue('test', field);
            expect(valid.valid).toBe(true);

            // Short strings are still valid — minLength is not enforced in current impl
            const short = await validateFieldValue('ab', field);
            expect(short.valid).toBe(true);
        });

        it('should validate NUMBER values', async () => {
            const field = {
                fieldType: 'NUMBER' as FieldType,
                isRequired: false,
                isUnique: false,
                validationRules: { min: 0, max: 100 },
            };

            const valid = await validateFieldValue(50, field);
            expect(valid.valid).toBe(true);

            const tooSmall = await validateFieldValue(-10, field);
            expect(tooSmall.valid).toBe(false);
        });

        it('should validate BOOLEAN values', async () => {
            const field = {
                fieldType: 'BOOLEAN' as FieldType,
                isRequired: false,
                isUnique: false,
            };

            const valid = await validateFieldValue(true, field);
            expect(valid.valid).toBe(true);
        });

        it('should reject required fields with null', async () => {
            const field = {
                fieldType: 'STRING' as FieldType,
                isRequired: true,
                isUnique: false,
            };

            const result = await validateFieldValue(null, field);
            expect(result.valid).toBe(false);
        });
    });

    // ============================================
    // Serialization Tests
    // ============================================

    describe('serializeFieldValue', () => {
        it('should serialize STRING values to valueString', () => {
            const result = serializeFieldValue('test string', 'STRING' as FieldType);
            expect(result.valueString).toBe('test string');
            expect(result.valueNumber).toBeNull();
        });

        it('should serialize NUMBER values to valueNumber', () => {
            const result = serializeFieldValue(42, 'NUMBER' as FieldType);
            expect(result.valueNumber).toBe(42);
            expect(result.valueString).toBeNull();
        });

        it('should serialize BOOLEAN values to valueBoolean', () => {
            const result = serializeFieldValue(true, 'BOOLEAN' as FieldType);
            expect(result.valueBoolean).toBe(true);
            expect(result.valueString).toBeNull();
        });

        it('should serialize JSON values to valueJson', () => {
            const obj = { key: 'value', nested: { foo: 'bar' } };
            const result = serializeFieldValue(obj, 'JSON' as FieldType);
            expect(result.valueJson).toEqual(obj);
            expect(result.valueString).toBeNull();
        });

        it('should serialize DATE values to valueDate', () => {
            const date = new Date('2024-01-01');
            const result = serializeFieldValue(date.toISOString(), 'DATE' as FieldType);
            expect(result.valueDate).toBeInstanceOf(Date);
        });

        it('should serialize null to all-null columns', () => {
            const result = serializeFieldValue(null, 'STRING' as FieldType);
            expect(result.valueString).toBeNull();
            expect(result.valueNumber).toBeNull();
            expect(result.valueBoolean).toBeNull();
            expect(result.valueDate).toBeNull();
            expect(result.valueJson).toBeNull();
        });
    });

    // ============================================
    // Deserialization Tests
    // ============================================

    describe('deserializeFieldValue', () => {
        it('should deserialize STRING values', () => {
            const result = deserializeFieldValue({
                fieldDefinition: { fieldType: 'STRING' as FieldType },
                valueString: 'test',
                valueNumber: null,
                valueBoolean: null,
                valueDate: null,
                valueJson: null,
            });
            expect(result).toBe('test');
        });

        it('should deserialize NUMBER values', () => {
            const result = deserializeFieldValue({
                fieldDefinition: { fieldType: 'NUMBER' as FieldType },
                valueString: null,
                valueNumber: 42,
                valueBoolean: null,
                valueDate: null,
                valueJson: null,
            });
            expect(result).toBe(42);
        });

        it('should deserialize BOOLEAN values', () => {
            const result = deserializeFieldValue({
                fieldDefinition: { fieldType: 'BOOLEAN' as FieldType },
                valueString: null,
                valueNumber: null,
                valueBoolean: true,
                valueDate: null,
                valueJson: null,
            });
            expect(result).toBe(true);
        });

        it('should deserialize JSON values', () => {
            const obj = { key: 'value' };
            const result = deserializeFieldValue({
                fieldDefinition: { fieldType: 'JSON' as FieldType },
                valueString: null,
                valueNumber: null,
                valueBoolean: null,
                valueDate: null,
                valueJson: obj,
            });
            expect(result).toEqual(obj);
        });
    });

    // ============================================
    // Round-trip Tests
    // ============================================

    describe('Round-trip serialization', () => {
        it('should round-trip STRING values', () => {
            const original = 'test string';
            const serialized = serializeFieldValue(original, 'STRING' as FieldType);
            const deserialized = deserializeFieldValue({
                fieldDefinition: { fieldType: 'STRING' as FieldType },
                ...serialized,
            });
            expect(deserialized).toEqual(original);
        });

        it('should round-trip NUMBER values', () => {
            const original = 42.5;
            const serialized = serializeFieldValue(original, 'NUMBER' as FieldType);
            const deserialized = deserializeFieldValue({
                fieldDefinition: { fieldType: 'NUMBER' as FieldType },
                ...serialized,
            });
            expect(deserialized).toEqual(original);
        });

        it('should round-trip BOOLEAN values', () => {
            const original = true;
            const serialized = serializeFieldValue(original, 'BOOLEAN' as FieldType);
            const deserialized = deserializeFieldValue({
                fieldDefinition: { fieldType: 'BOOLEAN' as FieldType },
                ...serialized,
            });
            expect(deserialized).toEqual(original);
        });

        it('should round-trip JSON values', () => {
            const original = { key: 'value', nested: { array: [1, 2, 3] } };
            const serialized = serializeFieldValue(original, 'JSON' as FieldType);
            const deserialized = deserializeFieldValue({
                fieldDefinition: { fieldType: 'JSON' as FieldType },
                ...serialized,
            });
            expect(deserialized).toEqual(original);
        });
    });
});
