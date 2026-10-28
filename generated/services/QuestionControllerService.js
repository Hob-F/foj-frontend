import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QuestionControllerService {
    questionSubmitId;
}
{
    if (questionSubmitId <= 0) {
        throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }
    QuestionSubmit;
    questionSubmit = questionSubmitService.getById(questionSubmitId);
    if (questionSubmit == null) {
        throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
    }
    QuestionSubmitVO;
    questionSubmitVO = new QuestionSubmitVO();
    BeanUtils.copyProperties(questionSubmit, questionSubmitVO);
    return ResultUtils.success(questionSubmitVO);
}
addQuestionUsingPost(questionAddRequest, QuestionAddRequest);
CancelablePromise < BaseResponse_long_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/add',
        body: questionAddRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
deleteQuestionUsingPost(deleteRequest, DeleteRequest);
CancelablePromise < BaseResponse_boolean_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/delete',
        body: deleteRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
editQuestionUsingPost(questionEditRequest, QuestionEditRequest);
CancelablePromise < BaseResponse_boolean_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/edit',
        body: questionEditRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
getQuestionByIdUsingGet(id ?  : number);
CancelablePromise < BaseResponse_Question_ > {
    return: __request(OpenAPI, {
        method: 'GET',
        url: '/api/question/get',
        query: {
            'id': id,
        },
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
getQuestionVoByIdUsingGet(id ?  : number);
CancelablePromise < BaseResponse_QuestionVO_ > {
    return: __request(OpenAPI, {
        method: 'GET',
        url: '/api/question/get/vo',
        query: {
            'id': id,
        },
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
listQuestionByPageUsingPost(questionQueryRequest, QuestionQueryRequest);
CancelablePromise < BaseResponse_Page_Question_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/list/page',
        body: questionQueryRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
listQuestionVoByPageUsingPost(questionQueryRequest, QuestionQueryRequest);
CancelablePromise < BaseResponse_Page_QuestionVO_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/list/page/vo',
        body: questionQueryRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
listMyQuestionVoByPageUsingPost(questionQueryRequest, QuestionQueryRequest);
CancelablePromise < BaseResponse_Page_QuestionVO_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/my/list/page/vo',
        body: questionQueryRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
doQuestionSubmitUsingPost(questionSubmitAddRequest, QuestionSubmitAddRequest);
CancelablePromise < BaseResponse_long_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/question_submit/do',
        body: questionSubmitAddRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
listQuestionSubmitByPageUsingPost(questionSubmitQueryRequest, QuestionSubmitQueryRequest);
CancelablePromise < BaseResponse_Page_QuestionSubmitVO_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/question_submit/list/page',
        body: questionSubmitQueryRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
updateQuestionUsingPost(questionUpdateRequest, QuestionUpdateRequest);
CancelablePromise < BaseResponse_boolean_ | any > {
    return: __request(OpenAPI, {
        method: 'POST',
        url: '/api/question/update',
        body: questionUpdateRequest,
        errors: {
            401: `Unauthorized`,
            403: `Forbidden`,
            404: `Not Found`,
        },
    })
};
//# sourceMappingURL=QuestionControllerService.js.map