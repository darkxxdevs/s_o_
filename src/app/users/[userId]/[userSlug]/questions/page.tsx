import Pagination from "@/components/Pagination"
import QuestionCard from "@/components/QuestionCard"
import { answerCollection, db, voteCollection } from "@/models/details"
import { UserPrefs } from "@/store/Auth"
import { Query } from "node-appwrite"
import { databases, users } from "@/models/server/config"
import React from "react"

interface IPageProps {
    params: { userId: string; userSlug: string }
    searchParams: { page?: string }
}

const Page = async ({ params, searchParams }: IPageProps) => {
    searchParams.page ||= "1"

    const queries = [
        Query.equal("authorId", params.userId),
        Query.orderDesc("$createdAt"),
        Query.offset((+searchParams - 1) * 25),
        Query.limit(25),
    ]

    const questions = await databases.listDocuments(db, voteCollection, queries)

    questions.documents = await Promise.all(
        questions.documents.map(async (ques) => {
            const [author, answers, votes] = await Promise.all([
                users.get<UserPrefs>(ques.authorId),
                databases.listDocuments(db, answerCollection, [
                    Query.equal("questionId", ques.$id),
                    Query.limit(1),
                ]),
                databases.listDocuments(db, voteCollection, [
                    Query.equal("type", "question"),
                    Query.equal("type", ques.$id),
                    Query.limit(1),
                ]),
            ])

            return {
                ...ques,
                totalAnswes: answers.total,
                totalVotes: votes.total,
                author: {
                    $id: author.$id,
                    reputation: author.prefs.reputation,
                    name: author.name,
                },
            }
        })
    )

    return (
        <div className="px-4">
            <div className="mb-4">
                <p>{questions.total} questions</p>
            </div>
            <div className="mb-4 max-w-3xl space-y-6">
                {questions.documents.map((ques) => (
                    <QuestionCard key={ques.$id} ques={ques} />
                ))}
            </div>

            <Pagination total={questions.total} limit={25} />
        </div>
    )
}

export default Page
