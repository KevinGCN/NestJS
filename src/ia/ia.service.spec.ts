import { ServiceUnavailableException } from '@nestjs/common';
import { IaService } from './ia.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

describe('IaService', () => {
  const original = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (original === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = original;
    }
  });

  it('responde 503 si el servidor no tiene GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    const service = new IaService();

    await expect(service.analizarTatuaje('un gato')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('devuelve el texto que genera Gemini', async () => {
    process.env.GEMINI_API_KEY = 'clave-de-prueba';
    mockGenerateContent.mockResolvedValue({ text: '{"complejidad":"Media"}' });

    const service = new IaService();
    const respuesta = await service.analizarTatuaje('un gato');

    expect(respuesta).toBe('{"complejidad":"Media"}');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('no filtra el detalle del error de Google', async () => {
    process.env.GEMINI_API_KEY = 'clave-de-prueba';
    mockGenerateContent.mockRejectedValue(
      new Error('request failed for key AQ.secreto: https://generativelanguage.googleapis.com/...?key=AQ.secreto'),
    );

    const service = new IaService();

    await expect(service.analizarTatuaje('un gato')).rejects.toThrow(
      /No se pudo completar/,
    );
  });
});
