import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { Request } from 'express';
import { subgraph } from './config/subgraph.js';
import { LoggerModule } from './logger/logger.module.js';
import { HealthModule } from './health/health.module.js';

const handleAuth = ({ req }: { req: Request }) => {
    const token = req.headers?.authorization ?? null;
    const query = req.body?.query ?? '';
    const isIntrospection = query.includes('__schema') || query.includes('__type');
    return { token, isIntrospection };
};

@Module({
    imports: [
        GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
            driver: ApolloGatewayDriver,
            server: {
                context: handleAuth,
            },
            gateway: {
                buildService: ({ url }) => {
                    return new RemoteGraphQLDataSource({
                        url,
                        willSendRequest({ request, context }: any) {
                            if (context.token) {
                                request.http.headers.set('authorization', context.token);
                            }
                            if (context.isIntrospection) {
                                request.http.headers.set('x-introspection', 'true');
                            }
                        },
                    });
                },
                supergraphSdl: new IntrospectAndCompose({
                    subgraphs: [
                        { name: 'answer', url: subgraph.answer },
                        { name: 'authentication', url: subgraph.authentication },
                        { name: 'notification', url: subgraph.notification },
                        { name: 'questionnaire', url: subgraph.questionnaire },
                        { name: 'user', url: subgraph.user },
                        // { name: 'vibeProfile', url: subgraph.vibeProfile },
                    ],
                }),
            },
        }),
        LoggerModule,
        HealthModule
    ],
})
export class AppModule {}
