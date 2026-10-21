import { validate } from 'class-validator';
import { IsImagenUrl } from './validadores';

class DtoPrueba {
  @IsImagenUrl()
  imagen_url: string;
}

async function validar(valor: string): Promise<string[]> {
  const dto = new DtoPrueba();
  dto.imagen_url = valor;
  const errores = await validate(dto);
  return errores.map((e) => e.property);
}

describe('IsImagenUrl', () => {
  it('acepta la ruta del backend "/api/imagenes/<id>"', async () => {
    expect(await validar('/api/imagenes/12')).toEqual([]);
  });

  it('acepta URLs absolutas', async () => {
    expect(await validar('https://ejemplo.com/foto.jpg')).toEqual([]);
  });

  it('acepta la ruta legacy "/uploads/<archivo>"', async () => {
    expect(await validar('/uploads/abc-123.jpg')).toEqual([]);
  });

  it('rechaza una ruta relativa cualquiera', async () => {
    expect(await validar('/otra/cosa.jpg')).toEqual(['imagen_url']);
  });

  it('rechaza esquemas peligrosos', async () => {
    expect(await validar('javascript:alert(1)')).toEqual(['imagen_url']);
  });

  it('rechaza un valor vacío', async () => {
    expect(await validar('')).toEqual(['imagen_url']);
  });
});
