import { updatePost, deletePost } from '../src/services/postService';
import { supabase } from '../src/integrations/supabase/client';

type SupabaseFromReturn = {
  select?: jest.Mock<any, any>;
  update?: jest.Mock<any, any>;
  delete?: jest.Mock<any, any>;
  eq?: jest.Mock<any, any>;
  single?: jest.Mock<any, any>;
};

jest.mock('../src/integrations/supabase/client', () => {
  const fromMock = jest.fn();
  const storageFromMock = jest.fn();
  const auth = { getUser: jest.fn() };
  return { supabase: { from: fromMock, storage: { from: storageFromMock }, auth } };
});

const mockedSupabase = supabase as unknown as {
  from: jest.Mock<any, any>;
  storage: { from: jest.Mock<any, any> };
  auth: { getUser: jest.Mock<any, any> };
};

describe('postService', () => {
  beforeEach(() => {
    mockedSupabase.from.mockReset();
    mockedSupabase.storage.from.mockReset();
    mockedSupabase.auth.getUser.mockReset();
  });

  it('updates a post and uploads image', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const selectChain: SupabaseFromReturn = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { content: { object: { type: 'Note', content: 'old' } } } })
    };
    const updateChain: SupabaseFromReturn = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'p1', published_at: 'now' } })
    };

    mockedSupabase.from
      .mockReturnValueOnce(selectChain as any)
      .mockReturnValueOnce(updateChain as any);

    const uploadMock = jest.fn().mockResolvedValue({ error: null });
    const getUrlMock = jest.fn().mockReturnValue({ data: { publicUrl: 'http://img' } });
    mockedSupabase.storage.from.mockReturnValue({ upload: uploadMock, getPublicUrl: getUrlMock } as any);

    const file = { name: 'pic.png', type: 'image/png' } as unknown as File;
    const result = await updatePost('p1', { content: 'new', imageFile: file });

    expect(result?.id).toBe('p1');
    expect(result?.content).toBe('new');
    expect(result?.imageUrl).toBe('http://img');
    expect(selectChain.select).toHaveBeenCalledWith('content');
    expect(uploadMock).toHaveBeenCalled();
    expect(updateChain.update).toHaveBeenCalled();
  });

  it('deletes a post', async () => {
    const deleteChain: SupabaseFromReturn = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null })
    };
    mockedSupabase.from.mockReturnValue(deleteChain as any);

    const result = await deletePost('p1');

    expect(result).toBe(true);
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'p1');
  });
});
