import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalEvidenceProvider } from '../providers/local-evidence.provider';

jest.mock('fs/promises');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => 'test-uuid',
}));

const makeFile = (originalname = 'foto.jpg', mimetype = 'image/jpeg', size = 1024): Express.Multer.File => ({
  fieldname: 'file',
  originalname,
  encoding: '7bit',
  mimetype,
  buffer: Buffer.from('fake-content'),
  size,
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
});

describe('LocalEvidenceProvider', () => {
  let provider: LocalEvidenceProvider;

  beforeEach(() => {
    provider = new LocalEvidenceProvider();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('cria diretório e salva arquivo com UUID', async () => {
      const result = await provider.save(makeFile(), 'asm-123');

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads', 'evidence', 'asm-123')),
        { recursive: true },
      );
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result.filename).toBe('test-uuid.jpg');
      expect(result.url).toBe('/uploads/evidence/asm-123/test-uuid.jpg');
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('preserva extensão do arquivo original', async () => {
      const result = await provider.save(makeFile('documento.pdf', 'application/pdf'), 'asm-1');
      expect(result.filename).toBe('test-uuid.pdf');
    });

    it('lida com arquivo sem extensão', async () => {
      const result = await provider.save(makeFile('arquivo', 'application/octet-stream'), 'asm-1');
      expect(result.filename).toBe('test-uuid');
    });

    it('usa o buffer do arquivo para salvar', async () => {
      const file = makeFile();
      await provider.save(file, 'asm-1');
      expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), file.buffer);
    });
  });

  describe('delete', () => {
    it('deleta arquivo existente', async () => {
      await provider.delete('test-uuid.jpg', 'asm-1');
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads', 'evidence', 'asm-1', 'test-uuid.jpg')),
      );
    });

    it('silencioso quando arquivo não existe (ENOENT)', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await expect(provider.delete('nao-existe.jpg', 'asm-1')).resolves.toBeUndefined();
    });

    it('silencioso para qualquer erro de unlink', async () => {
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('qualquer erro'));
      await expect(provider.delete('arquivo.jpg', 'asm-1')).resolves.toBeUndefined();
    });
  });
});
