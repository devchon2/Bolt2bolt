// ...existing code...
    test('devrait autoriser l\'accès quand aucune règle n\'est définie', async () => {
      // Simuler un robots.txt sans règles
      mockedAxios.get.mockResolvedValueOnce({
        data: ''
      });

      const result = await isAllowed('https://example.com/page', 'https://example.com', 'GPTCrawler');

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/robots.txt',
        expect.objectContaining({
          timeout: expect.any(Number),
          headers: expect.objectContaining({ 'User-Agent': 'GPTCrawler/1.0' })
        })
      );
    });

    test('devrait interdire l\'accès quand une règle disallow est définie', async () => {
      // Simuler un robots.txt avec une règle disallow
      mockedAxios.get.mockResolvedValueOnce({
        data: 'User-agent: GPTCrawler\nDisallow: /page'
      });

      const result = await isAllowed('https://example.com/page', 'https://example.com', 'GPTCrawler');

      expect(result).toBe(false);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/robots.txt',
        expect.objectContaining({
          timeout: expect.any(Number),
          headers: expect.objectContaining({ 'User-Agent': 'GPTCrawler/1.0' })
        })
      );
    });

    test('devrait gérer les erreurs réseau', async () => {
      // Simuler une erreur réseau
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await isAllowed('https://example.com/page', 'https://example.com', 'GPTCrawler');

      expect(result).toBe(false);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/robots.txt',
        expect.objectContaining({
          timeout: expect.any(Number),
          headers: expect.objectContaining({ 'User-Agent': 'GPTCrawler/1.0' })
        })
      );
    });
  });
});
