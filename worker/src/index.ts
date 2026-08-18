export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
}

export default {
  fetch(request: Request): Response {
    const { pathname } = new URL(request.url);

    if (request.method === 'GET' && pathname === '/health') {
      return Response.json({
        service: 'cuellar-photography-worker',
        environment: 'local',
      });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;