/**
 * Tests for tool schemas
 */

import {
  TOOL_SCHEMAS,
  GENERATE_IMAGE_SCHEMA,
  GENERATE_VIDEO_SCHEMA,
  GENERATE_VIDEO_FROM_IMAGE_SCHEMA,
  ALL_TOOL_SCHEMAS
} from '../src/tool-schemas.js';

describe('Tool Schemas', () => {
  describe('TOOL_SCHEMAS object', () => {
    test('should contain all three tools', () => {
      expect(Object.keys(TOOL_SCHEMAS)).toHaveLength(3);
      expect(TOOL_SCHEMAS).toHaveProperty('generate_image');
      expect(TOOL_SCHEMAS).toHaveProperty('generate_video');
      expect(TOOL_SCHEMAS).toHaveProperty('generate_video_from_image');
    });
  });

  describe('generate_image schema', () => {
    test('should have correct structure', () => {
      expect(GENERATE_IMAGE_SCHEMA).toHaveProperty('name', 'generate_image');
      expect(GENERATE_IMAGE_SCHEMA).toHaveProperty('description');
      expect(GENERATE_IMAGE_SCHEMA).toHaveProperty('inputSchema');
    });

    test('should have valid inputSchema', () => {
      const { inputSchema } = GENERATE_IMAGE_SCHEMA;
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toHaveProperty('prompt');
      expect(inputSchema.properties).toHaveProperty('model');
      expect(inputSchema.properties).toHaveProperty('temperature');
      expect(inputSchema.properties).toHaveProperty('topP');
      expect(inputSchema.properties).toHaveProperty('topK');
      expect(inputSchema.properties).toHaveProperty('save');
      expect(inputSchema.required).toContain('prompt');
    });

    test('should have correct parameter constraints', () => {
      const { properties } = GENERATE_IMAGE_SCHEMA.inputSchema;
      expect(properties.temperature.minimum).toBe(0.0);
      expect(properties.temperature.maximum).toBe(1.0);
      expect(properties.topP.minimum).toBe(0.0);
      expect(properties.topP.maximum).toBe(1.0);
      expect(properties.topK.minimum).toBe(1);
    });
  });

  describe('generate_video schema', () => {
    test('should have correct structure', () => {
      expect(GENERATE_VIDEO_SCHEMA).toHaveProperty('name', 'generate_video');
      expect(GENERATE_VIDEO_SCHEMA).toHaveProperty('description');
      expect(GENERATE_VIDEO_SCHEMA).toHaveProperty('inputSchema');
    });

    test('should use veo-2.0-generate-001 model', () => {
      const { properties } = GENERATE_VIDEO_SCHEMA.inputSchema;
      expect(properties.model.enum).toContain('veo-2.0-generate-001');
    });
  });

  describe('generate_video_from_image schema', () => {
    test('should have correct structure', () => {
      expect(GENERATE_VIDEO_FROM_IMAGE_SCHEMA).toHaveProperty('name', 'generate_video_from_image');
      expect(GENERATE_VIDEO_FROM_IMAGE_SCHEMA).toHaveProperty('description');
      expect(GENERATE_VIDEO_FROM_IMAGE_SCHEMA).toHaveProperty('inputSchema');
    });
  });

  describe('ALL_TOOL_SCHEMAS array', () => {
    test('should contain all three schemas', () => {
      expect(ALL_TOOL_SCHEMAS).toHaveLength(3);
      expect(ALL_TOOL_SCHEMAS).toContain(GENERATE_IMAGE_SCHEMA);
      expect(ALL_TOOL_SCHEMAS).toContain(GENERATE_VIDEO_SCHEMA);
      expect(ALL_TOOL_SCHEMAS).toContain(GENERATE_VIDEO_FROM_IMAGE_SCHEMA);
    });

    test('all schemas should have consistent structure', () => {
      ALL_TOOL_SCHEMAS.forEach(schema => {
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('description');
        expect(schema).toHaveProperty('inputSchema');
        expect(schema.inputSchema).toHaveProperty('type', 'object');
        expect(schema.inputSchema).toHaveProperty('properties');
        expect(schema.inputSchema).toHaveProperty('required');
        expect(schema.inputSchema.required).toContain('prompt');
      });
    });
  });

  describe('Schema consistency', () => {
    test('all schemas should have same parameter types', () => {
      ALL_TOOL_SCHEMAS.forEach(schema => {
        const { properties } = schema.inputSchema;

        if (properties.temperature) {
          expect(properties.temperature.type).toBe('number');
          expect(properties.temperature.minimum).toBe(0.0);
          expect(properties.temperature.maximum).toBe(1.0);
        }

        if (properties.topP) {
          expect(properties.topP.type).toBe('number');
          expect(properties.topP.minimum).toBe(0.0);
          expect(properties.topP.maximum).toBe(1.0);
        }

        if (properties.topK) {
          expect(properties.topK.type).toBe('number');
          expect(properties.topK.minimum).toBe(1);
        }

        if (properties.save) {
          expect(properties.save.type).toBe('boolean');
        }
      });
    });
  });
});
