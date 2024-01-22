export default async function AnonymousStrategy(request, reply, done) {
    request.log.info('AnonymousStrategy');
    done();
}